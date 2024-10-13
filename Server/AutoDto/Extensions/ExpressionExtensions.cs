using System.Linq.Expressions;
using AutoDto.Enums;

namespace AutoDto.Extensions;

public static class ExpressionExtensions {
	public static Expression? Combine(this Expression? left, Expression? right, CombineType combineType) {
		if (right == null) return left;
		if (left == null) return right;

		return combineType switch {
			CombineType.And => Expression.AndAlso(left, right),
			CombineType.Or => Expression.OrElse(left, right),
			_ => throw new ArgumentOutOfRangeException(nameof(combineType), combineType, null)
		};
	}
}