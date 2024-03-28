using System.Linq.Expressions;
using Tools.Filtration.Enums;

namespace Tools.Filtration.Extensions;

public static class ExpressionExtensions {
	public static Expression Combine(this Expression left, Expression right, CombineType combineType) {
		/*if (left is null && right is null) {
			throw new ArgumentNullException("right and ")
		}*/

		if (left == null )
			return right;
		if (right == null)
			return left;

		if (left is ParameterExpression or MemberExpression)
			return right;
		if (right is ParameterExpression or MemberExpression)
			return left;

		return combineType switch {
			CombineType.And => Expression.AndAlso(left, right),
			CombineType.Or => Expression.OrElse(left, right),
			_ => throw new ArgumentOutOfRangeException(nameof(combineType), combineType, null)
		};
	}
}