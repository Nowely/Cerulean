using System.Linq.Expressions;
using AutoDto.Types;
using AutoDto.Abstractions;
using AutoDto.Enums;
using PropertyPair = (System.Reflection.PropertyInfo filterProperty, System.Reflection.PropertyInfo? targetProperty);

namespace AutoDto.Extensions;

internal static class ExpressionHelper {
	internal static Expression<Func<TElement, bool>>? BuildLambda<TElement>(object? filter) {
		if (filter is null) return null;

		var parameter = Expression.Parameter(typeof(TElement), "x");
		var body = filter switch {
			IFilterModel filterModel => BuildBody(typeof(TElement), filterModel, parameter),
			IFilterGroup filterGroup => filterGroup.BuildExpressionFor(typeof(TElement), parameter),
			_ => throw new ArgumentOutOfRangeException(nameof(filter), filter, null)
		};

		return body is null ? null : Expression.Lambda<Func<TElement, bool>>(body, parameter);
	}

	internal static Expression? BuildBody(Type targetType, IFilterModel filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			switch (filterProperty.GetValue(filter)) {
				case IFilterOperator filterOperator: {
					var property = Expression.Property(parameter, targetProperty!.Name);
					var expression = filterOperator.BuildExpressionFor(property);
					bodyExpression = bodyExpression.Combine(expression, CombineType.And);
					break;
				}
				case IFilterGroup[] filterGroups: {
					foreach (var group in filterGroups) {
						var expression = group.BuildExpressionFor(targetType, parameter);
						bodyExpression = bodyExpression.Combine(expression, CombineType.Or);
					}
					break;
				}
			}
		}

		return bodyExpression;


		static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, object filter) =>
			filter
				.GetType()
				.GetProperties()
				.Select(filterProperty =>
					(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)));
	}
}