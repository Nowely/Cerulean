using Cerulean.Library.Filtration.Enums;
using Cerulean.Library.Filtration.Models;
using Cerulean.Library.Filtration.Models.Operators;

namespace Affairs.Models.Affair;

public record AffairFilter {
	public StringOperator? Name { get; init; }
	public NumberOperator<int>? Age { get; init; }
	public EnumOperator<Status>? Enum { get; init; }
	public DateOperator<DateTime>? Birthday { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForName(StringOperatorType type, string? value) =>
		new() { Name = new(type, value) };

	public static AffairFilter ForAge(NumberOperatorType type, int value) =>
		new() { Age = new(type, value) };

	public static AffairFilter WithSubGroups(FilterGroup<AffairFilter>[] groups) =>
		new() { Groups = groups };
}