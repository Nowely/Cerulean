using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Types;

namespace Afilter.Extensions;

public static class FilterExtensions {
	public static IQueryable<TElement> ApplyFilter<TElement>(this IQueryable<TElement> query, IFilterGroup? filter) {
		if (filter is null) return query;

		var parameter = Expression.Parameter(typeof(TElement), "x");
		var body = filter.BuildExpressionFor(typeof(TElement), parameter);
		//var body = ExpressionHelper.BuildBody(typeof(TElement), filter, parameter);

		if (body is null) return query;
		var lambda =  Expression.Lambda<Func<TElement, bool>>(body, parameter);

		return query.Where(lambda);
	}

	public static IQueryable<TElement> ApplyFilter<TElement>(this IQueryable<TElement> query, IFilter? filter) {
		if (filter is null) return query;

		var parameter = Expression.Parameter(typeof(TElement), "x");
		var body = ExpressionHelper.BuildBody(typeof(TElement), filter, parameter);
		if (body is null) return query;

		var lambda = Expression.Lambda<Func<TElement, bool>>(body, parameter);
		return query.Where(lambda);
	}
}