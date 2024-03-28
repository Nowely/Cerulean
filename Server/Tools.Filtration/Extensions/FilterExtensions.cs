using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;
using Tools.Filtration.Models;

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
			if (filterProperty.GetValue(filter) is not IFilterOperator filterOperator) continue;

			var target = Expression.Property(parameter, targetProperty.Name);

			var expression = filterOperator.BuildExpressionFor(target);
			if(expression is not null)
				bodyExpression = expression.Combine(bodyExpression, CombineType.And);
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