using System.Linq.Expressions;
using System.Reflection;
using Afilter.Models;
using Afilter.Abstractions;
using Afilter.Enums;
using Afilter.Types;
using Tools.Filtration.Abstractions;

namespace Afilter.Extensions;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo? targetProperty);

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity, TFilterModel>(
		this IQueryable<TEntity> query,
		FilterGroup<TFilterModel> filter
	) where TFilterModel : IFilter {
		var lambda = filter.BuildLambdaExpression<TEntity, TFilterModel>();
		return lambda is null ? query : query.Where(lambda);
	}

	public static IQueryable<TEntity> ApplyFilter<TEntity>(this IQueryable<TEntity> query, IFilter? filter) {
		if (filter is null) return query;
		var lambda = BuildLambdaExpression<TEntity>(filter);
		return lambda is null ? query : query.Where(lambda);
	}

	private static Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity>(IFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), filter, parameter);

		return body is null ? null : Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	internal static Expression? BuildBodyExpression(Type targetType, IFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			if (filterProperty.GetValue(filter) is IFilterOperator filterOperator) {

				var target = Expression.Property(parameter, targetProperty!.Name);

				var expression = filterOperator.BuildExpressionFor(target);
				bodyExpression = expression.Combine(bodyExpression, CombineType.And);
			} else if (filterProperty.GetValue(filter) is object[] filterGroups) {
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
	}

	private static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, IFilter filter) =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)))
			/*.Where(tuple => tuple.targetProperty is not null || tuple.filterProperty is FilterGroup<IFilter>[])!*/;
}