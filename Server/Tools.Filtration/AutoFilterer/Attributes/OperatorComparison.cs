#if LEGACY_NAMESPACE
using AutoFilterer.Enums;
#endif
using AutoFilterer.Extensions;
using System;
using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Attributes;

[AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
public class OperatorComparison : FilteringOptionsBaseAttribute
{
    public OperatorComparison(OperatorType operatorType)
    {
        this.OperatorType = operatorType;
    }

    public OperatorType OperatorType { get; }

    public override Expression BuildExpression(ExpressionBuildContext context)
    {
        var prop = Expression.Property(context.ExpressionBody, context.TargetProperty.Name);

        var filterProp = BuildFilterExpression(context);

        var targetIsNullable = context.TargetProperty.PropertyType.IsNullable() || context.TargetProperty.PropertyType == typeof(string);

        if (context.TargetProperty.PropertyType.IsNullable())
        {
            prop = Expression.Property(prop, nameof(Nullable<bool>.Value));
        }

        switch (OperatorType)
        {
            case OperatorType.Equal:
                return Expression.Equal(prop, filterProp);
            case OperatorType.NotEqual:
                return Expression.NotEqual(prop, filterProp);
            case OperatorType.GreaterThan:
                return Expression.GreaterThan(prop, filterProp);
            case OperatorType.GreaterThanOrEqual:
                return Expression.GreaterThanOrEqual(prop, filterProp);
            case OperatorType.LessThan:
                return Expression.LessThan(prop, filterProp);
            case OperatorType.LessThanOrEqual:
                return Expression.LessThanOrEqual(prop, filterProp);
            case OperatorType.IsNull:
                return targetIsNullable ? Expression.Equal(Expression.Property(context.ExpressionBody, context.TargetProperty.Name), Expression.Constant(null)) : null;
            case OperatorType.IsNotNull:
                return targetIsNullable ? Expression.Not(Expression.Equal(Expression.Property(context.ExpressionBody, context.TargetProperty.Name), Expression.Constant(null))) : null;
        }

        return Expression.Empty();
    }

    #region Static

    public static OperatorComparison Equal { get; }
    public static OperatorComparison NotEqual { get; }
    public static OperatorComparison GreaterThan { get; }
    public static OperatorComparison GreaterThanOrEqual { get; }
    public static OperatorComparison LessThan { get; }
    public static OperatorComparison LessThanOrEqual { get; }
    public static OperatorComparison IsNull { get; }
    public static OperatorComparison IsNotNull { get; }

    static OperatorComparison()
    {
        Equal = new OperatorComparison(OperatorType.Equal);
        NotEqual = new OperatorComparison(OperatorType.NotEqual);
        GreaterThan = new OperatorComparison(OperatorType.GreaterThan);
        GreaterThanOrEqual = new OperatorComparison(OperatorType.GreaterThanOrEqual);
        LessThan = new OperatorComparison(OperatorType.LessThan);
        LessThanOrEqual = new OperatorComparison(OperatorType.LessThanOrEqual);
        IsNull = new OperatorComparison(OperatorType.IsNull);
        IsNotNull = new OperatorComparison(OperatorType.IsNotNull);
    }

    #endregion
}