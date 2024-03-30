using System.Linq.Expressions;
using Afilter.Abstractions;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators.Number;

public record NumberOperator<T>(NumberOperatorType Type, T? Value = default) : IFilterOperator {
	public Expression? BuildExpressionFor(MemberExpression target) {
		var filter = Property(Expression.Constant(this), nameof(Value));

		return Type switch {
			NumberOperatorType.Equal => Equal(target, filter),
			NumberOperatorType.NotEqual => NotEqual(target, filter),

			NumberOperatorType.Greater => GreaterThan(target, filter),
			NumberOperatorType.GreaterOrEqual => GreaterThanOrEqual(target, filter),

			NumberOperatorType.Less => LessThan(target, filter),
			NumberOperatorType.LessOrEqual => LessThanOrEqual(target, filter),

			NumberOperatorType.IsEmpty => IsEmpty(target),
			NumberOperatorType.IsNotEmpty => Not(IsEmpty(target)),

			_ => null
		};
	}

	private static BinaryExpression IsEmpty(Expression target) => Equal(target, Constant(default(T)));
}