using System.Linq.Expressions;
using System.Reflection;
using Afftration.Abstractions;
using Afftration.Enums;
using Afftration.Types;
using Afftration.Models;
using Tools.Filtration.Abstractions;

namespace Afftration.Extensions;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo targetProperty);

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity, TFilterModel>(
		this IQueryable<TEntity> query,
		FilterGroup<TFilterModel> filter
	) where TFilterModel : IFilter {
		var lambda = filter.BuildLambdaExpression<TEntity, TFilterModel>();
		return lambda is null ? query : query.Where(lambda);
	}

	public static IQueryable<TEntity> ApplyFilter<TEntity>(this IQueryable<TEntity> query, IFilter filter) {
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
			if (filterProperty.GetValue(filter) is not IFilterOperator filterOperator) continue;

			var target = Expression.Property(parameter, targetProperty.Name);

			var expression = filterOperator.BuildExpressionFor(target);
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