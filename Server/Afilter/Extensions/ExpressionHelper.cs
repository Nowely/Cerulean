using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Enums;
using PropertyPair = (System.Reflection.PropertyInfo filterProperty, System.Reflection.PropertyInfo? targetProperty);

namespace Afilter.Extensions;

internal static class ExpressionHelper {
	internal static Expression? BuildBody(Type targetType, IFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			//In case for IFilterOperator
			if (filterProperty.GetValue(filter) is IFilterOperator filterOperator) {
				var target = Expression.Property(parameter, targetProperty!.Name);

				var expression = filterOperator.BuildExpressionFor(target);
				bodyExpression = expression.Combine(bodyExpression, CombineType.And);
			}
			//In case for filter group
			else if (filterProperty.GetValue(filter) is object[] filterGroups) {
				foreach (object group in filterGroups) {
					var methodInfo = group.GetType().GetMethod("BuildBodyExpression");
					object? result = methodInfo?.Invoke(group, [targetType, parameter]);
					if (result is Expression expression) {
						bodyExpression = expression.Combine(bodyExpression, CombineType.Or);
					}
				}
			}
		}

		return bodyExpression;


		static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, IFilter filter) =>
			filter
				.GetType()
				.GetProperties()
				.Select(filterProperty =>
					(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)));
	}
}