using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Enums;
using PropertyPair = (System.Reflection.PropertyInfo filterProperty, System.Reflection.PropertyInfo? targetProperty);

namespace Afilter.Extensions;

internal static class ExpressionHelper {
	internal static Expression? BuildBody(Type elementType, IFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(elementType, filter)) {
			switch (filterProperty.GetValue(filter)) {
				case IFilterOperator filterOperator:
					var target = Expression.Property(parameter, targetProperty!.Name);

					var expression1 = filterOperator.BuildExpressionFor(target);
					bodyExpression = expression1.Combine(bodyExpression, CombineType.And);
					break;

				case IFilterGroup[] filterGroups:
					foreach (var group in filterGroups) {
						var expression2 = group.BuildExpressionFor(elementType, parameter);
						bodyExpression = expression2.Combine(bodyExpression, CombineType.Or);
					}

					break;
			}
		}

		return bodyExpression;
	}

	internal static Expression? BuildBody(Type elementType, IFilterGroup filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(elementType, filter)) {
			switch (filterProperty.GetValue(filter)) {
				case IFilterOperator filterOperator:
					var target = Expression.Property(parameter, targetProperty!.Name);

					var expression1 = filterOperator.BuildExpressionFor(target);
					bodyExpression = expression1.Combine(bodyExpression, CombineType.And);
					break;

				case IFilterGroup[] filterGroups:
					foreach (var group in filterGroups) {
						var expression2 = group.BuildExpressionFor(elementType, parameter);
						bodyExpression = expression2.Combine(bodyExpression, CombineType.Or);
					}

					break;
			}
		}

		return bodyExpression;
	}

	static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, object filter) =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)));
}