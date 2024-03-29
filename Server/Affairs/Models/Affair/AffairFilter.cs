using Afftration.Abstractions;
using Afftration.Models;
using Afftration.Operators.Date;
using Afftration.Operators.Enum;
using Afftration.Operators.Number;
using Afftration.Operators.String;
using Afftration.Types;
using Tools.Filtration.Abstractions;

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