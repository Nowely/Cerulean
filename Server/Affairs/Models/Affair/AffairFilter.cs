using Afilter.Operators.String;
using Afilter.Types;
using Tools.Filtration.Abstractions;

namespace Affairs.Models.Affair;

public record AffairFilter : IFilter{
	public StringOperator? Title { get; init; }
	public StringOperator? Note { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForTitle(StringOperatorType type, string? value) =>
		new() { Title = new(type, value) };

	public static AffairFilter ForNote(StringOperatorType type, string? value) =>
		new() { Note = new(type, value) };

	public static AffairFilter WithGroups(FilterGroup<AffairFilter>[] groups) => new() { Groups = groups };
}