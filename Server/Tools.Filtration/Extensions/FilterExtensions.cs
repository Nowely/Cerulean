using System.Linq.Expressions;
using System.Reflection;
using AutoFilterer.Abstractions;
using AutoFilterer.Extensions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.AutoFilterer.Types;
using Tools.Filtration.Enums;

namespace Tools.Filtration.Extensions;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo targetProperty);

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity>(this IQueryable<TEntity> query, IMyFilter filter) {
		var lambda = BuildLambdaExpression<TEntity>(filter);
		return lambda is null ? query : query.Where(lambda);
	}

	private static Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity>(IMyFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), filter, parameter);

		return body is null
			? null
			: Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private static Expression? BuildBodyExpression(Type targetType, IMyFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			if (filterProperty.GetValue(filter) is not IFilterableType filterPropertyValue) continue;

			var filterPropertyExpression = Expression.Property(Expression.Constant(filter), filterProperty);

			var context = new ExpressionBuildContext(
				bodyExpression,
				targetProperty,
				filterProperty,
				filterPropertyExpression,
				filter,
				filterPropertyValue,
				parameter
			);

			var expression = filterPropertyValue.BuildExpression(context);
			bodyExpression = bodyExpression.Combine(expression, CombineType.And);
		}

		return bodyExpression;
	}

	private static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, IMyFilter filter) =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)))
			.Where(tuple => tuple.targetProperty is not null)!;
}