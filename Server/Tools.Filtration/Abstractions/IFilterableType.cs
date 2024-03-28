using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.Models;

namespace Tools.Filtration.Abstractions;

/// <summary>
/// Any property type which is able to <see cref="BuildExpressionFor"/> over source property.
/// <list type="table">
/// <item>
/// You can create new Complex Types via implementing this interface. It'll be automatically called if defined in an object which is implements <see cref="IFilter"/>.
/// </item>
/// </list>
/// </summary>
public interface IFilterableType
{
    Expression? BuildExpressionFor(MemberExpression target);
}
