using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Types;

namespace Afilter.Extensions;

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

		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = ExpressionHelper.BuildBody(typeof(TEntity), filter, parameter);
		if (body is null) return query;

		var lambda = Expression.Lambda<Func<TEntity, bool>>(body, parameter);
		return query.Where(lambda);
	}
}