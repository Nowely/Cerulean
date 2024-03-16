namespace Cerulean.Service.Affairs.Models.Affair;

public record AffairFilter {
	public StringFilter? Name { get; init; }
	public NumberFilter<int>? Age { get; init; }
	public EnumFilter<Status>? Enum { get; init; }
	public DateFilter<DateTime>? Birthday { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForName(StringComparison type, string? value) =>
		new() { Name = new(type, value) };

	public static AffairFilter ForAge(NumberComparison type, int value) =>
		new() { Age = new(type, value) };

	public static AffairFilter WithSubGroups(FilterGroup<AffairFilter>[] groups) =>
		new() { Groups = groups };
}