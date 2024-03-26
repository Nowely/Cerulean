#if LEGACY_NAMESPACE
using AutoFilterer.Enums;
#endif
using AutoFilterer.Abstractions;
using AutoFilterer.Attributes;
using AutoFilterer.Extensions;
using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Types;

public class OperatorFilter<T> : IFilterableType
    where T : struct
{
    public virtual T? Eq { get; set; }
    public virtual T? Not { get; set; }
    public virtual T? Gt { get; set; }
    public virtual T? Lt { get; set; }
    public virtual T? Gte { get; set; }
    public virtual T? Lte { get; set; }
    public virtual bool? IsNull { get; set; }
    public virtual bool? IsNotNull { get; set; }

    public virtual CombineType CombineWith { get; set; }
    public virtual Expression BuildExpression(ExpressionBuildContext context)
    {
        Expression expression = null;

        if (Eq != null)
        {
            expression = expression.Combine(
                OperatorComparison.Equal.BuildExpression(
                    ContextFor(context, nameof(Eq), Eq)
                ),
                CombineWith);
        }

        if (Gt != null)
            expression = expression.Combine(OperatorComparison.GreaterThan.BuildExpression(ContextFor(context, nameof(Gt), Gt)), CombineWith);

        if (Lt != null)
            expression = expression.Combine(OperatorComparison.LessThan.BuildExpression(ContextFor(context, nameof(Lt), Lt)), CombineWith);

        if (Gte != null)
            expression = expression.Combine(OperatorComparison.GreaterThanOrEqual.BuildExpression(ContextFor(context, nameof(Gte), Gte)), CombineWith);

        if (Lte != null)
            expression = expression.Combine(OperatorComparison.LessThanOrEqual.BuildExpression(ContextFor(context, nameof(Lte), Lte)), CombineWith);

        if (Not != null)
            expression = expression.Combine(OperatorComparison.NotEqual.BuildExpression(ContextFor(context, nameof(Not), Not)), CombineWith);

        if (IsNull != null)
        {
            if (IsNull.Value)
            {
                expression = expression.Combine(OperatorComparison.IsNull.BuildExpression(ContextFor(context, nameof(IsNull), null)), CombineWith);
            }
            else
            {
                expression = expression.Combine(OperatorComparison.IsNotNull.BuildExpression(ContextFor(context, nameof(IsNull), null)), CombineWith);
            }
        }
        
        if (IsNotNull != null)
        {
            if (IsNotNull.Value)
            {
                expression = expression.Combine(OperatorComparison.IsNotNull.BuildExpression(ContextFor(context, nameof(IsNotNull), null)), CombineWith);
            }
            else
            {
                expression = expression.Combine(OperatorComparison.IsNull.BuildExpression(ContextFor(context, nameof(IsNotNull), null)), CombineWith);
            }
        }

        return expression;
    }

    private ExpressionBuildContext ContextFor(ExpressionBuildContext originalContext, string propertyName, T? value)
    {
        var innerProperty = originalContext.FilterProperty.PropertyType.GetProperty(propertyName);
        var innerPropertyExpression = Expression.Property(originalContext.FilterPropertyExpression, innerProperty);

        return new ExpressionBuildContext(
            originalContext.CurrentBody,
            originalContext.TargetProperty,
            innerProperty,
            innerPropertyExpression,
            originalContext.Filter,
			//TODO this is a placeholder
            new StringFilter());
    }
}
