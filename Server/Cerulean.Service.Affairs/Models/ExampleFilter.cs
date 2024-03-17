using Cerulean.Library.Filtration.Enums;
using Cerulean.Library.Filtration.Models;
using Cerulean.Service.Affairs.Models.Affair;

namespace Cerulean.Service.Affairs.Models;

class ExampleFilter {
	static void Main() {
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.And,
			Where = [
				AffairFilter.ForName(StringOperatorType.Is, "Aurora"),
				AffairFilter.ForAge(NumberOperatorType.Equal, 4),
				AffairFilter.WithSubGroups([
					new() {
						Type = CombineType.Or,
						Where = [
							AffairFilter.ForName(StringOperatorType.Is, ""),
							AffairFilter.ForAge(NumberOperatorType.Equal, 4),
						]
					}
				])
			]
		};
	}
}