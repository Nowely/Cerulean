using Affairs.Models.Affair;
using Afftration.Enums;
using Afftration.Models;
using Afftration.Operators.Number;
using Afftration.Operators.String;
using Afftration.Types;

namespace Affairs.Models;

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