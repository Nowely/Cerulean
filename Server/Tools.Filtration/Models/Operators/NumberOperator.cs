using System.Linq.Expressions;
using AutoFilterer.Abstractions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.Enums;
using static System.Linq.Expressions.Expression;

namespace Tools.Filtration.Models.Operators;

public record NumberOperator<T>(NumberOperatorType Type, T? Value = default) : IFilterableType {
	public Expression? BuildExpression(ExpressionBuildContext context) {
		//TODO move to context
		var target = Property(context.ParameterExpression, context.TargetProperty.Name);
		var innerProperty = context.FilterProperty.PropertyType.GetProperty(nameof(Value));
		var filter = Property(context.FilterPropertyExpression, innerProperty);

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

	private static BinaryExpression IsEmpty(Expression target) => //Or(
		//Equal(target, Constant(null)),
		Equal(target, Constant(default(T)))
	//)
	;
}