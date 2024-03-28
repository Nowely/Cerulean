using System.Linq.Expressions;

namespace Tools.Filtration.Abstractions;

/// <summary>
/// Base type of References.
/// </summary>
public interface IFilter
{
    Expression BuildExpression(Type entityType, Expression body);
    IQueryable<TEntity> ApplyFilterTo<TEntity>(IQueryable<TEntity> query);
}
