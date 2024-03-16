using Cerulean.Service.Affairs.Models.Affair;
using Cerulean.Service.Affairs.Models.Domain;

namespace Cerulean.Service.Affairs.Models;

class MyClass {
	static void Main() {
		var filter = new FilterGroup<AffairFilter> {
			Type = CombineType.And,
			Where = [
				AffairFilter.ForName(StringComparison.Is, "Aurora"),
				AffairFilter.ForAge(NumberComparison.Equal, 4),
				AffairFilter.WithSubGroups([
					new() {
						Type = CombineType.Or,
						Where = [
							AffairFilter.ForName(StringComparison.Is, ""),
							AffairFilter.ForAge(NumberComparison.Equal, 4),
						]
					}
				])
			]
		};
	}
}

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

public record FilterGroup<T> {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }
}

public record StringFilter(StringComparison Type, string? Value);

public record NumberFilter<T>(NumberComparison Type, T? Value);

//Это любые типы перечислений, когда предоставляется на выбор несколько состояний.
public record EnumFilter<T>(EnumComparison Type, T[]? Value);

//TODO value for DateFilter
public record DateFilter<T>(DateComparison Type);

//Right is string
public enum StringComparison {
	Is,
	IsNot,
	Contains,
	NotContains,
	StartsWith,
	EndsWith,
	IsEmpty,
	IsNotEmpty,
}

//Right is array of enum state / tags
public enum EnumComparison {
	Is,
	IsNot,
	IsEmpty,
	IsNotEmpty
}

public enum DateComparison {
	Is,
	IsBefore,
	IsAfter,
	IsOnOrBefore,
	IsOnOrAfter,
	IsBetween,
	IsRelativeToToday, //Past, Next value > 0, This (day, week, month, year)
	IsEmpty,
	IsNotEmpty
}

public enum NumberComparison {
	Equal,
	NotEqual,
	Less,
	LessOrEqual,
	Greater,
	GreaterOrEqual,
	IsEmpty,
	IsNotEmpty
}

public enum CombineType {
	And,
	Or
}