using System.Linq.Expressions;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Models;

namespace Tools.Filtration.References.Attributes;

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

    /*public Expression BuildExpressionFor(ExpressionBuildContext context)
    {
        var expressionBody = context.CurrentBody;

        if (context.FilterPropertyValue is IFilter filter)
        {
            var type = context.TargetProperty.PropertyType.GetGenericArguments().FirstOrDefault();

            var parameter = Expression.Parameter(type, "a"); // TODO: Change parameter name according to nested execution level.

            var innerLambda = Expression.Lambda(filter.BuildExpressionFor(type, body: parameter), parameter);
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
    }*/
}
