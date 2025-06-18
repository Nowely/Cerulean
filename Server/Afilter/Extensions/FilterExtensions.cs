using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Types;

namespace Afilter.Extensions;

public static class FilterExtensions {
	public static IQueryable<TElement> ApplyFilter<TElement>(this IQueryable<TElement> query, IFilterGroup? filter) =>
		ExpressionHelper.BuildLambda<TElement>(filter) is { } lambda
			? query.Where(lambda)
			: query;

	public static IQueryable<TElement> ApplyFilter<TElement>(this IQueryable<TElement> query, IFilterModel? filter) =>
		ExpressionHelper.BuildLambda<TElement>(filter) is { } lambda
			? query.Where(lambda)
			: query;
}