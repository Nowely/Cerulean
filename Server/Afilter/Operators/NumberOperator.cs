using System.Linq.Expressions;
using System.Text.Json.Serialization;
using Afilter.Abstractions;
using Afilter.Internals;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<NumberOperatorType>))]
public enum NumberOperatorType {
	/// <summary> Alias == </summary>
	Equal,
	/// <summary> Alias != </summary>
	NotEqual,
	/// <summary> Alias &lt; </summary>
	Less,
	/// <summary> Alias &lt;= </summary>
	LessOrEqual,
	/// <summary> Alias > </summary>
	Greater,
	/// <summary> Alias >= </summary>
	GreaterOrEqual,
	IsEmpty,
	IsNotEmpty
}

public record NumberOperator<T>(NumberOperatorType Type, T? Value = default) : IFilterOperator {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) =>
		Type switch {
			NumberOperatorType.Equal => Equal(target, Filter),
			NumberOperatorType.NotEqual => NotEqual(target, Filter),

			NumberOperatorType.Greater => GreaterThan(target, Filter),
			NumberOperatorType.GreaterOrEqual => GreaterThanOrEqual(target, Filter),

			NumberOperatorType.Less => LessThan(target, Filter),
			NumberOperatorType.LessOrEqual => LessThanOrEqual(target, Filter),

			NumberOperatorType.IsEmpty => IsEmpty(target),
			NumberOperatorType.IsNotEmpty => Not(IsEmpty(target)),

			_ => null
		};

	private static BinaryExpression IsEmpty(Expression target) => Equal(target, Constant(default(T)));
}