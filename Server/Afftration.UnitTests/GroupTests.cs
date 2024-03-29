using AutoFixture.Xunit2;
using Afftration.Abstractions;
using Afftration.Enums;
using Afftration.Extensions;
using Afftration.Models;
using Afftration.Operators.Date;
using Afftration.Operators.Enum;
using Afftration.Operators.Number;
using Afftration.Operators.String;
using Afftration.Types;
using Tools.Filtration.Abstractions;
using Xunit;

namespace Afftration.UnitTests;

public record Affair {
	public required string Name { get; set; }
	public int Age { get; set; }
}

public record AffairFilter : IFilter {
	public StringOperator? Name { get; init; }

	public NumberOperator<int>? Age { get; init; }
	//public EnumOperator<Status>? Enum { get; init; }
	//public DateOperator<DateTime>? Birthday { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForName(StringOperatorType type, string? value) => new() { Name = new(type, value) };
	public static AffairFilter ForAge(NumberOperatorType type, int value) => new() { Age = new(type, value) };

	public static AffairFilter WithSubGroups(FilterGroup<AffairFilter>[] groups) => new() { Groups = groups };
}

public class GroupTests {
	[Theory, AutoData]
	public void FilterGroup_CombineTypeAnd_Success(Affair[] affairs) {
		affairs[0].Name = "Aurora";
		affairs[0].Age = 4;
		var query = affairs.AsQueryable();
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.And,
			Where = [
				AffairFilter.ForName(StringOperatorType.Is, "Aurora"),
				AffairFilter.ForAge(NumberOperatorType.Equal, 4),
			]
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), affairs[0]);
	}

	/*[Theory, AutoData]
	public void FilterGroup_Success1(Affair[] affairs) {
		affairs[0].Name = "Aurora";
		affairs[0].Age = 4;
		var query = affairs.AsQueryable();
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
	}*/
}