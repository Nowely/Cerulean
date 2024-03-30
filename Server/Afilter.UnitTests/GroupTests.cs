using AutoFixture.Xunit2;
using Afilter.Enums;
using Afilter.Extensions;
using Afilter.Operators.Number;
using Afilter.Operators.String;
using Afilter.Types;
using Tools.Filtration.Abstractions;
using Xunit;

namespace Afilter.UnitTests;

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

	public static AffairFilter WithGroups(FilterGroup<AffairFilter>[] groups) => new() { Groups = groups };
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

	[Theory, AutoData]
	public void FilterGroup_CombineTypeOr_Success(Affair[] affairs) {
		affairs[0].Name = "Aurora";
		affairs[1].Age = 4;
		var query = affairs.AsQueryable();
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.Or,
			Where = [
				AffairFilter.ForName(StringOperatorType.Is, "Aurora"),
				AffairFilter.ForAge(NumberOperatorType.Equal, 4),
			]
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
		Assert.Equal(result[0], affairs[0]);
		Assert.Equal(result[1], affairs[1]);
	}

	[Theory, AutoData]
	public void FilterSubGroup_CombineTypeAnd_Success(Affair[] affairs) {
		affairs[0].Name = "Aurora";
		affairs[0].Age = 4;
		var query = affairs.AsQueryable();
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.And,
			Where = [
				AffairFilter.WithGroups([
					new() {
						Type = CombineType.And,
						Where = [
							AffairFilter.ForName(StringOperatorType.Is, "Aurora"),
							AffairFilter.ForAge(NumberOperatorType.Equal, 4),
						]
					}
				])
			]
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Single(result);
		Assert.Equal(result.First(), affairs[0]);
	}

	[Theory, AutoData]
	public void FilterSubGroup_CombineTypeOr_Success(Affair[] affairs) {
		affairs[0].Name = "Aurora";
		affairs[1].Age = 4;
		var query = affairs.AsQueryable();
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.And,
			Where = [
				AffairFilter.WithGroups([
					new() {
						Type = CombineType.Or,
						Where = [
							AffairFilter.ForName(StringOperatorType.Is, "Aurora"),
							AffairFilter.ForAge(NumberOperatorType.Equal, 4),
						]
					}
				])
			]
		};

		var filteredQuery = query.ApplyFilter(filter);
		var result = filteredQuery.ToArray();

		Assert.Equal(2, result.Length);
		Assert.Equal(result[0], affairs[0]);
		Assert.Equal(result[1], affairs[1]);
	}
}