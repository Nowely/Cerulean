using Tools.Filtration.Abstractions;
using Tools.Filtration.Models;
using Tools.Filtration.Operators.Date;
using Tools.Filtration.Operators.Enum;
using Tools.Filtration.Operators.Number;
using Tools.Filtration.Operators.String;
using Tools.Filtration.Types;

namespace Affairs.Models.Affair;

public record AffairFilter: IFilter {
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