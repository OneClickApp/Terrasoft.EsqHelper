define("EsqFiltersHelperPage", [], function() {
	return {
		entitySchemaName: "",
		messages: {
			/**
			 * Подписка на получение конфигурационного объекта модуля фильтров.
			 */
			"GetFilterModuleConfig": {
				mode: Terrasoft.MessageMode.PTP,
				direction: Terrasoft.MessageDirectionType.SUBSCRIBE
			},

			/**
			 * Подписка на изменение фильтра.
			 */
			"OnFiltersChanged": {
				mode: Terrasoft.MessageMode.BROADCAST,
				direction: Terrasoft.MessageDirectionType.SUBSCRIBE
			}
		},
		attributes: {
			"SchemaName": {
				onChange: "onSchemaNameChange"
			},
		},
		modules: /**SCHEMA_MODULES*/{}/**SCHEMA_MODULES*/,
		details: /**SCHEMA_DETAILS*/{}/**SCHEMA_DETAILS*/,
		businessRules: /**SCHEMA_BUSINESS_RULES*/{}/**SCHEMA_BUSINESS_RULES*/,
		methods: {
			onRender: function() {
				this.callParent(arguments);
				this.getFilters();
			},
			
			onSchemaNameChange: function(){
				this.updateFilter();
			},
			//123
			updateFilter: function() {
				var moduleId = this.sandbox.id + "_ExtendedFilterEditModule";
				this.sandbox.subscribe("OnFiltersChanged", function(args) {
					this.set("Filters", args.filter);
					this.set("FilterEditData", args.serializedFilter);
					this.createEsqFilters(args.serializedFilter);
				}, this, [moduleId]);
				this.sandbox.subscribe("GetFilterModuleConfig", function() {
					var queueEntitySchema = this.get("QueueEntitySchema");
					return {
						rootSchemaName: this.get("SchemaName"),
						filters: this.get("FilterEditData")
					};
				}, this, [moduleId]);
				this.sandbox.loadModule("FilterEditModule", {
					renderTo: "FilterProperties",
					id: moduleId
				});
			},
			
			filterIndex: 0,
			filterGroupIndex: 0,
			subFilterIndex: 0,

			createEsqFilters: function(filters){
				
				this.filterIndex = 0;
				this.filterGroupIndex = 0;
				this.subFilterIndex = 0;
			
				var filterResult = ""; 
				var filtersParsed = JSON.parse(filters);
				if(filtersParsed.className == "Terrasoft.FilterGroup"){
					filterResult += this.createFilterGroup(filtersParsed);
				}
				this.set("EsqFilters", filterResult + this.getItems(filtersParsed.items));
				
				this.saveFilters();
			},
			
			createFilter: function(filter, filterName, groupName){
				this.filterIndex++;
				var currentFilterIndex = this.filterIndex;
				var currentGroupName = 'filterGroup' + this.filterGroupIndex;
				if(groupName){
					currentGroupName = groupName;
				}
				var currentFilterName = 'filter' + currentFilterIndex;
				if(filterName){
					currentFilterName = filterName;
				}
				var result = 'var ' + currentFilterName + ' = this.Terrasoft.createColumnFilterWithParameter(' + this.getComparisonType(filter.comparisonType) + ', "' + filter.leftExpression.columnPath + '", ' + Ext.encode(filter.rightExpression.parameter.value) + ');' + '\r\n';
				result += currentGroupName + '.add("' + currentFilterName +'", ' + currentFilterName +');' + '\r\n';
				
				return result;
			},
			
			createInFilter: function(filter, filterName, groupName){
				
				var currentGroupName = 'filterGroup' + this.filterGroupIndex;
				if(groupName){
					currentGroupName = groupName;
				}
				
				var valuesArr = "[";
				Terrasoft.each(filter.rightExpressions, function(extItem, extName){
					valuesArr += '"' + extItem.parameter.value.value + '",'
				}, this);
				valuesArr += "]";
				var result = currentGroupName + '.addItem(Terrasoft.createColumnInFilterWithParameters("' + filter.leftExpression.columnPath + '", ' + valuesArr + '));' + '\r\n';
				
				return result;
			},
			
			createFilterGroup: function(filterGroup){
				this.filterGroupIndex++;
				var result = 'var filterGroup' + this.filterGroupIndex + ' = this.Ext.create("Terrasoft.FilterGroup");\r\n'
				if(filterGroup.logicalOperation === 0){
					result += 'filterGroup' + this.filterGroupIndex + '.logicalOperation = Terrasoft.LogicalOperatorType.AND;\r\n';
				}
				if(filterGroup.logicalOperation === 1){
					result += 'filterGroup' + this.filterGroupIndex + '.logicalOperation = Terrasoft.LogicalOperatorType.OR;\r\n';
				}
				
				if(this.filterGroupIndex > 1){
					result += 'filterGroup' + (this.filterGroupIndex - 1) + '.add("filterGroup' + this.filterGroupIndex + '", filterGroup' + this.filterGroupIndex + ');\r\n';
				}
				
				return result;
			},
			
			createSubfilter: function(filter){
				this.filterIndex++;
				this.subFilterIndex++;
				
				var currentFilterIndex = this.filterIndex;
				var currentSubFilterIndex = this.subFilterIndex;
				
				var result = 'var filter'+ currentFilterIndex +' = Ext.create("' + filter.className + '", {' + '\r\n' +
				'	comparisonType: ' + this.getComparisonType(filter.comparisonType) + ',' + '\r\n' +
				'	leftExpression: Ext.create("' + filter.leftExpression.className + '", {' + '\r\n' +
				'		columnPath: "' + filter.leftExpression.columnPath + '",' + '\r\n' +
				'		aggregationType: ' + this.getAggregationType(filter.leftExpression.aggregationType) + '' + '\r\n' +
				'	}),' + '\r\n' +
				'	rightExpression: Ext.create("' + filter.rightExpression.className + '", {parameterValue: ' + filter.rightExpression.parameter.value + '})' + '\r\n' +
				'});' + '\r\n' +
				'var subFilter'+ this.subFilterIndex +' = filter'+ currentFilterIndex +'.leftExpression.subFilters;' + '\r\n';
				
				result += this.getItems(filter.leftExpression.subFilters.items, "", 'subFilter'+ this.subFilterIndex);
				
				result += 'filterGroup' + this.filterGroupIndex + '.add("filter'+ currentFilterIndex +'", filter'+ currentFilterIndex +');' + '\r\n';
				
				return result;
			},
			
			getItems: function(items, filterName, groupName){
				var filterResult = "";
				Terrasoft.each(items, function(item, name){
					if(item.className == "Terrasoft.FilterGroup"){
						filterResult += this.createFilterGroup(item, filterName, groupName);
					}
					if(item.className == "Terrasoft.InFilter"){
						filterResult += this.createInFilter(item, filterName, groupName);
					}
					if(item.items){
						filterResult += this.getItems(item.items);
					}else{
						if(item.className == "Terrasoft.CompareFilter"){
							if(item.leftExpression.subFilters){
								filterResult += this.createSubfilter(item, filterName, groupName);
							}else{
								filterResult += this.createFilter(item, filterName, groupName);
							}
						}
					}
				}, this);
				return filterResult;
			},
			
			onCheckButtonClick: function(){
				
				var config = {
					entitySchemaName: this.get("SchemaName"),
					filters: this.runCode(this.get("EsqFilters"), this),
					multiSelect: false,
					columns: ["Name"]
				};
				
				this.openLookup(config, function(args) {}, this);
			},
			
			runCode: function(script, scope) {
				return function() { with(this) { return eval('(function(){' + script + '; return filterGroup1;}())'); }; }.call(scope);
			},
			
			getComparisonType: function(comparisonType){
				if(comparisonType == "0") return "Terrasoft.ComparisonType.BETWEEN";
				if(comparisonType == "11") return "Terrasoft.ComparisonType.CONTAIN";
				if(comparisonType == "13") return "Terrasoft.ComparisonType.END_WITH";
				if(comparisonType == "3") return "Terrasoft.ComparisonType.EQUAL";
				if(comparisonType == "15") return "Terrasoft.ComparisonType.EXISTS";
				if(comparisonType == "7") return "Terrasoft.ComparisonType.GREATER";
				if(comparisonType == "8") return "Terrasoft.ComparisonType.GREATER_OR_EQUAL";
				if(comparisonType == "2") return "Terrasoft.ComparisonType.IS_NOT_NULL";
				if(comparisonType == "1") return "Terrasoft.ComparisonType.IS_NULL";
				if(comparisonType == "5") return "Terrasoft.ComparisonType.LESS";
				if(comparisonType == "6") return "Terrasoft.ComparisonType.LESS_OR_EQUAL";
				if(comparisonType == "12") return "Terrasoft.ComparisonType.NOT_CONTAIN";
				if(comparisonType == "14") return "Terrasoft.ComparisonType.NOT_END_WITH";
				if(comparisonType == "4") return "Terrasoft.ComparisonType.NOT_EQUAL";
				if(comparisonType == "16") return "Terrasoft.ComparisonType.NOT_EXISTS";
				if(comparisonType == "10") return "Terrasoft.ComparisonType.NOT_START_WITH";
				if(comparisonType == "9") return "Terrasoft.ComparisonType.START_WITH";
			},
			
			getAggregationType: function(aggregationType){
				if(aggregationType == "3") return "Terrasoft.AggregationType.AVG";
				if(aggregationType == "1") return "Terrasoft.AggregationType.COUNT";
				if(aggregationType == "5") return "Terrasoft.AggregationType.MAX";
				if(aggregationType == "4") return "Terrasoft.AggregationType.MIN";
				if(aggregationType == "0") return "Terrasoft.AggregationType.NONE";
				if(aggregationType == "2") return "Terrasoft.AggregationType.SUM";
			},
			
			saveFilters: function(){
				localStorage.setItem("esqFiltersSchema", this.get("SchemaName"));
				localStorage.setItem("esqFiltersCode", this.get("EsqFilters"));
				localStorage.setItem("esqFiltersJson", this.get("FilterEditData"));
			},
			
			getFilters: function(){
				var esqFiltersSchema = localStorage.getItem("esqFiltersSchema");
				var esqFiltersCode = localStorage.getItem("esqFiltersCode");
				var esqFiltersJson = localStorage.getItem("esqFiltersJson");
				
				if(esqFiltersSchema && esqFiltersCode && esqFiltersJson){
					
					this.set("SchemaName", esqFiltersSchema);
					this.set("EsqFilters", esqFiltersCode);
					this.set("FilterEditData", esqFiltersJson);
				}
			}
		},
		dataModels: /**SCHEMA_DATA_MODELS*/{}/**SCHEMA_DATA_MODELS*/,
		diff: /**SCHEMA_DIFF*/[
			{
				"operation": "insert",
				"name": "Button-11941d8ecaa24ef69752ee1138afcf5d",
				"values": {
					"itemType": 5,
					"id": "b8bc685a-df16-4a81-923b-a65a33b3a671",
					"style": "green",
					"tag": "CheckButton",
					"caption": {
						"bindTo": "getProcessActionButtonCaption"
					},
					"click": {
						"bindTo": "onCheckButtonClick"
					},
					"enabled": true
				},
				"parentName": "ProcessActionButtons",
				"propertyName": "items",
				"index": 0
			},
			{
				"operation": "insert",
				"name": "STRINGe538e282-307b-4c80-8caa-f3a2578e45e8",
				"values": {
					"layout": {
						"colSpan": 24,
						"rowSpan": 1,
						"column": 0,
						"row": 0,
						"layoutName": "LeftTopContainer"
					},
					"bindTo": "SchemaName",
					"enabled": true
				},
				"parentName": "LeftTopContainer",
				"propertyName": "items",
				"index": 0
			},
			{
				"operation": "insert",
				"name": "FilterProperties",
				"values": {
					"id": "FilterProperties",
					"itemType": 7,
					"items": [],
					"layout": {
						"colSpan": 24,
						"rowSpan": 1,
						"column": 0,
						"row": 0
					}
				},
				"parentName": "CardContentContainer",
				"propertyName": "items",
				"index": 0
			},
			{
				"operation": "merge",
				"name": "NewTab1",
				"values": {
					"order": 0
				}
			},
			{
				"operation": "insert",
				"name": "STRINGb04e5fdf-e25d-4a0f-9d8d-fffda00b8668",
				"values": {
					"layout": {
						"colSpan": 24,
						"rowSpan": 2,
						"column": 0,
						"row": 0,
						"layoutName": "NewTab1GridLayout1"
					},
					"bindTo": "EsqFilters",
					"labelConfig": {
						"visible": false
					},
					"enabled": true,
					"contentType": 0
				},
				"parentName": "NewTab1GridLayout1",
				"propertyName": "items",
				"index": 0
			},
			{
				"operation": "remove",
				"name": "Button-be6148b819154a0791eaee8f1635d859"
			}
		]/**SCHEMA_DIFF*/
	};
});
