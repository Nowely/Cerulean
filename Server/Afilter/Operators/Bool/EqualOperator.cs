using System.Linq.Expressions;
using Afilter.Abstractions;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators.Bool;

public record EqualOperator<T>(T Value) : IFilterOperator {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) => Equal(target, Filter);
}