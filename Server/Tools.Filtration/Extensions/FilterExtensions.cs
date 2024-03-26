using System.Linq.Expressions;
using System.Reflection;
using AutoFilterer;
using AutoFilterer.Abstractions;
using AutoFilterer.Attributes;
using AutoFilterer.Extensions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.AutoFilterer.Types;

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
		//if (body is MemberExpression or ParameterExpression) return null;
		if (body is null) return null;

		return Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private static Expression? BuildBodyExpression(Type targetType, IMyFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			object? filterPropertyValue = filterProperty.GetValue(filter);
			if (filterPropertyValue is null) continue;

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

			Expression? expression = null;

			if (context.FilterPropertyValue is IFilterableType filterableProperty)
			{
				expression =  filterableProperty.BuildExpression(context);
			}

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