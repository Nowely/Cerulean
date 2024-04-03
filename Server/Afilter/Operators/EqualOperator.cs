using System.Linq.Expressions;
using Afilter.Abstractions;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators;

public record EqualOperator<T>(T Value) : IFilterOperator {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) => Expression.Equal(target, Filter);
}