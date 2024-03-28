#if LEGACY_NAMESPACE
using AutoFilterer.Enums;
#endif
using AutoFilterer.Abstractions;
using AutoFilterer;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Attributes;

[Flags]
public enum CollectionFilterType
{
	Any,
	All,
}

public class CollectionFilterAttribute
{
    public CollectionFilterAttribute()
    {
    }

    public CollectionFilterAttribute(CollectionFilterType filterOption)
    {
        this.FilterOption = filterOption;
    }

    public CollectionFilterType FilterOption { get; set; }

    public Expression BuildExpression(ExpressionBuildContext context)
    {
        var expressionBody = context.CurrentBody;

        if (context.FilterPropertyValue is IFilter filter)
        {
            var type = context.TargetProperty.PropertyType.GetGenericArguments().FirstOrDefault();

            var parameter = Expression.Parameter(type, "a"); // TODO: Change parameter name according to nested execution level.

            var innerLambda = Expression.Lambda(filter.BuildExpression(type, body: parameter), parameter);
            var prop = Expression.Property(context.CurrentBody, context.TargetProperty.Name);
            var methodInfo = typeof(Enumerable).GetMethods().LastOrDefault(x => x.Name == FilterOption.ToString());
            var method = methodInfo.MakeGenericMethod(type);

            expressionBody = Expression.Call(
                                        method: method,
                                        instance: null,
                                        arguments: new Expression[] { prop, innerLambda }
                );
        }

        return expressionBody;
    }
}
