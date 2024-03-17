using System.Linq.Expressions;
using AutoFilterer.Abstractions;
using Cerulean.Library.Filtration.Models;

namespace Cerulean.Library.Filtration.Extensions;

//using A = Expression<Func<TSource, bool>>;

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity>(IQueryable<TEntity> query, IFilterableType filter) {
		return query;
	}
}