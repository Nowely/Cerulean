using System.Linq.Expressions;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Attributes;

public class StringFilterOptionsAttribute : FilteringOptionsBaseAttribute
{
    public StringFilterOption Option { get; set; }

    public StringComparison? Comparison { get; set; }

    public override Expression BuildExpression(ExpressionBuildContext context)
    {
        if (Comparison == null)
        {
            return BuildExpressionWithoutComparison(this.Option, context);
        }
        else
        {
            return BuildExpressionWithComparison(this.Option, context);
        }
    }

    private Expression BuildExpressionWithComparison(StringFilterOption option, ExpressionBuildContext context)
    {
        var method = typeof(string).GetMethod(option.ToString(), types: [typeof(string), typeof(StringComparison)]);
        var filterProp = BuildFilterExpression(context);

        var comparison = Expression.Call(
                              method: method,
                              instance: Expression.Property(context.CurrentBody, context.TargetProperty.Name),
                              arguments: [filterProp, Expression.Constant(Comparison)]);

        return comparison;
    }

    private Expression BuildExpressionWithoutComparison(StringFilterOption option, ExpressionBuildContext context)
    {
        var method = typeof(string).GetMethod(option.ToString(), types: [typeof(string)]);

        var filterProp = BuildFilterExpression(context);

        var comparison = Expression.Call(
                            method: method,
                            instance: Expression.Property(context.CurrentBody, context.TargetProperty.Name),
                            arguments: [filterProp]);

        return comparison;
    }
}
