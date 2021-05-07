define("SystemDesigner", ["SystemDesignerResources", "ProcessModuleUtilities"],
	function(resources, ProcessModuleUtilities) {
	return {
		attributes: {},
		methods: {
			onEsqFiltersHelperProcessLinkClick: function() {
				ProcessModuleUtilities.executeProcess({
                    sysProcessName: "EsqFiltersHelper"
                });
				return false;
			}
		},
		diff: [
			{
				"operation": "insert",
				"propertyName": "items",
				"parentName": "InstallExtensionsTile",
				"name": "EsqFiltersHelperProcessLink",
              	"index": 2,
				"values": {
					"itemType": Terrasoft.ViewItemType.LINK,
					"caption": {"bindTo": "Resources.Strings.EsqFiltersHelperProcessLinkCaption"},
					"click": {"bindTo": "onEsqFiltersHelperProcessLinkClick"}
				}
			}
		]
	};
});