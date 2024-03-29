using System.Linq.Expressions;

namespace Afftration.Abstractions;

/// <summary>
/// Any property type which is able to <see cref="BuildExpressionFor"/> over source property.
/// </summary>
public interface IFilterOperator
{
    Expression? BuildExpressionFor(MemberExpression target);
}
