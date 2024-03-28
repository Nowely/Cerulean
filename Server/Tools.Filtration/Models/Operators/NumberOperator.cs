using System.Linq.Expressions;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;
using static System.Linq.Expressions.Expression;

namespace Tools.Filtration.Models.Operators;

public record NumberOperator<T>(NumberOperatorType Type, T? Value = default) : IFilterableType {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) => Type switch {
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

	private static BinaryExpression IsEmpty(Expression target) => //Or(
		//Equal(target, Constant(null)),
		Equal(target, Constant(default(T)))
	//)
	;
}