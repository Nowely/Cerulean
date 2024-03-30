using System.Text.Json;
using Afilter.Operators.String;
using Afilter.Types;
using Tools.Filtration.Abstractions;

namespace Affairs.Models.Affair;

public record AffairFilter : IFilter, IParsable<AffairFilter> {
	public StringOperator? Title { get; init; }
	public StringOperator? Note { get; init; }

	public FilterGroup<AffairFilter>[]? Groups { get; set; }

	public static AffairFilter ForTitle(StringOperatorType type, string? value) =>
		new() { Title = new(type, value) };

	public static AffairFilter ForNote(StringOperatorType type, string? value) =>
		new() { Note = new(type, value) };

	public static AffairFilter WithGroups(FilterGroup<AffairFilter>[] groups) => new() { Groups = groups };

	public static AffairFilter Parse(string s, IFormatProvider? provider) {
		throw new NotImplementedException();
	}

	public static bool TryParse(string? s, IFormatProvider? provider, out AffairFilter result) {
		if (s is null) {
			result = new();
			return false;
		}

		try {
			var result1 = JsonSerializer.Deserialize<AffairFilter>(s, new JsonSerializerOptions() {
				PropertyNameCaseInsensitive = true
			});
			if (result1 is null) {
				result = new();
				return false;
			}

			result = result1;
			return true;
		} catch (Exception e) {
			// ignored
		}

		result = new();
		return false;
	}
}