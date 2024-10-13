using System.Linq.Expressions;
using System.Text.Json.Serialization;
using AutoDto.Abstractions;
using AutoDto.Internals;
using static System.Linq.Expressions.Expression;

namespace AutoDto.Operators;

/// <summary> Represents the types of operators that can be used for filtering dates. </summary>
[JsonConverter(typeof(JsonStringOrNumberEnumConverter<DateOperatorType>))]
public enum DateOperatorType {
	/// <summary> Represents the operator for checking if a date value is equal to a specific value. </summary>
	Is,

	/// <summary> Represents the 'IsBefore' date operator type. </summary>
	IsBefore,

	/// <summary> Represents a date operator type that filters dates that are after a specified value. </summary>
	IsAfter,

	/// <summary> Represents the operator type for filtering dates that are on or before a specific date. </summary>
	IsOnOrBefore,

	/// <summary> Represents the "Is On Or After" operator for filtering dates. </summary>
	IsOnOrAfter,

	/// <summary> Represents the operator for checking if a date value is between a range of dates. </summary>
	IsBetween,

	/// <summary> Represents the operator that filters dates based on their relationship with today's date. </summary>
	IsRelativeToToday, //Past, Next value > 0, This (day, week, month, year)

	/// <summary> Represents an operator to check if a date property is empty. </summary>
	IsEmpty,

	/// <summary> Represents a date operator that checks if a date value is not empty. </summary>
	IsNotEmpty
}

public record DateOperator<T>(DateOperatorType Type, object Value) : IFilterOperator {
	public Expression? BuildExpressionFor(MemberExpression target) => Type switch {
		DateOperatorType.Is => Equal(target, Constant(Value)),
		DateOperatorType.IsBefore => LessThan(target, Constant(Value)),
		DateOperatorType.IsAfter => GreaterThan(target, Constant(Value)),
		DateOperatorType.IsOnOrBefore => LessThanOrEqual(target, Constant(Value)),
		DateOperatorType.IsOnOrAfter => GreaterThanOrEqual(target, Constant(Value)),
		DateOperatorType.IsBetween => BuildIsBetweenExpression(target),
		DateOperatorType.IsEmpty => Equal(target, Constant(null)),
		DateOperatorType.IsNotEmpty => NotEqual(target, Constant(null)),
		DateOperatorType.IsRelativeToToday => BuildIsRelativeToTodayExpression(target),
		_ => throw new ArgumentOutOfRangeException()
	};

	private Expression? BuildIsRelativeToTodayExpression(MemberExpression target) {
		if (Value is not int days)
			throw new ArgumentException("Value must be an integer representing the number of days relative to today");

		var relativeDate = DateTime.Today.AddDays(days);
		Expression relativeDateExpression = Constant(relativeDate);

		return days switch {
			> 0 => GreaterThan(target, relativeDateExpression),
			< 0 => LessThan(target, relativeDateExpression),
			0 => Equal(target, relativeDateExpression)
		};
	}

	private Expression? BuildIsBetweenExpression(MemberExpression target) {
		if (Value is not Tuple<DateTime, DateTime> range) return null;
		Expression lowerBounds = GreaterThanOrEqual(target, Constant(range.Item1));
		Expression upperBounds = LessThanOrEqual(target, Constant(range.Item2));
		return AndAlso(lowerBounds, upperBounds);
	}
}