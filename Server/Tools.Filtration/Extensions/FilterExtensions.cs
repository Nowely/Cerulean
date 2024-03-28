using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;
using Tools.Filtration.Models;
using Tools.Filtration.Types;

namespace Tools.Filtration.Extensions;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo targetProperty);

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity, TFilterModel>(
		this IQueryable<TEntity> query,
		FilterGroup<TFilterModel> filter
	) where TFilterModel : IFilter {
		var lambda = BuildLambdaExpression<TEntity, TFilterModel>(filter);
		return lambda is null ? query : query.Where(lambda);
	}

	private static Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity, TFilterModel>(
		FilterGroup<TFilterModel> filter
	) where TFilterModel : IFilter {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), filter, parameter);

		return body is null
			? null
			: Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private static Expression? BuildBodyExpression<TFilterModel>(
		Type targetType,
		FilterGroup<TFilterModel> filter,
		Expression parameter
	) where TFilterModel : IFilter {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			if (filterProperty.GetValue(filter) is not IFilterOperator filterOperator) continue;

			var target = Expression.Property(parameter, targetProperty.Name);

			var expression = filterOperator.BuildExpressionFor(target);
			if (expression is not null)
				bodyExpression = expression.Combine(bodyExpression, CombineType.And);
		}

		return bodyExpression;
	}

	private static IEnumerable<PropertyPair> GetPropertyPairs<TFilterModel>(
		Type targetType, FilterGroup<TFilterModel> filter
		) where TFilterModel : IFilter =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)))
			.Where(tuple => tuple.targetProperty is not null)!;

	public static IQueryable<TEntity> ApplyFilter<TEntity>(this IQueryable<TEntity> query, IFilter filter) {
		var lambda = BuildLambdaExpression<TEntity>(filter);
		return lambda is null ? query : query.Where(lambda);
	}

	private static Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity>(IFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), filter, parameter);

		return body is null
			? null
			: Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private static Expression? BuildBodyExpression(Type targetType, IFilter filter, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, filter)) {
			if (filterProperty.GetValue(filter) is not IFilterOperator filterOperator) continue;

			var target = Expression.Property(parameter, targetProperty.Name);

			var expression = filterOperator.BuildExpressionFor(target);
			if (expression is not null)
				bodyExpression = expression.Combine(bodyExpression, CombineType.And);
		}

		return bodyExpression;
	}

	private static IEnumerable<PropertyPair> GetPropertyPairs(Type targetType, IFilter filter) =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)))
			.Where(tuple => tuple.targetProperty is not null)!;
}