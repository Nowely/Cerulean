using System.Text.Json.Serialization;
using AutoDto.Abstractions;
using AutoDto.Operators;
using AutoDto.Types;

namespace Affairs.Models.Affair;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShortStringOperatorType {
	Is,
	IsNot,
	Contains,
	NotContains,
	StartsWith,
}

public record AffairFilter : IFilterModel{
	public StringOperator? Title { get; init; }
	public StringOperator<ShortStringOperatorType>? Note { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForTitle(StringOperatorType type, string? value) =>
		new() { Title = new(type, value) };

	public static AffairFilter ForNote(ShortStringOperatorType type, string? value) =>
		new() { Note = new(type, value) };

	public static AffairFilter WithGroups(FilterGroup<AffairFilter>[] groups) => new() { Groups = groups };
}