using AutoFilterer.Abstractions;
using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Attributes;

[AttributeUsage(AttributeTargets.Property, AllowMultiple = true)]
public class CompareToAttribute : FilteringOptionsBaseAttribute
{
    private Type filterableType;

    public CompareToAttribute(params string[] propertyNames)
    {
        PropertyNames = propertyNames;
    }

    public CompareToAttribute(Type filterableType, params string[] propertyNames)
    {
        FilterableType = filterableType;
        PropertyNames = propertyNames;
    }

    public string[] PropertyNames { get; set; }

    /// <summary>
    /// Gets or sets CombineType parameter. All properties are combined with 'Or' by default.
    /// </summary>
    public CombineType CombineWith { get; set; } = CombineType.Or;

    /// <summary>
    /// Type must implement <see cref="IFilterableType"/> and must has parameterless constructor.
    /// </summary>
    public Type FilterableType
    {
        get => filterableType;
        set
        {
            if (!typeof(IFilterableType).IsAssignableFrom(value))
            {
                throw new ArgumentException($"The {value.FullName} type must implement 'IFilterableType'", nameof(FilterableType));
            }

            filterableType = value;
        }
    }

	public virtual Expression BuildExpressionForProperty(ExpressionBuildContext context)
	{
		if (FilterableType != null)
		{
			return ((IFilterableType)Activator.CreateInstance(FilterableType)).BuildExpression(context);
		}

		var attribute = context.FilterProperty
							   .GetCustomAttributes<FilteringOptionsBaseAttribute>()
							   .FirstOrDefault(x => !(x is CompareToAttribute));

		if (attribute != null)
		{
			return attribute.BuildExpression(context);
		}

		return BuildDefaultExpression(context);
	}

	public override Expression BuildExpression(ExpressionBuildContext context)
    {
        // TODO: Decide to use context.ExpressionBody itself of use a local variable 'expressionBody'.
        var expressionBody = context.CurrentBody;

        for (int i = 0; i < PropertyNames.Length; i++)
        {
            var targetPropertyName = PropertyNames[i];
            var _targetProperty = context.TargetProperty.DeclaringType.GetProperty(targetPropertyName);

            var newContext = new ExpressionBuildContext(
                                    expressionBody,
                                    _targetProperty,
                                    context.FilterProperty,
                                    context.FilterPropertyExpression,
                                    context.Filter,
                                    context.FilterPropertyValue);

            if (FilterableType != null)
            {
                expressionBody = ((IFilterableType)Activator.CreateInstance(FilterableType)).BuildExpression(newContext);
            }
            else
            {
                expressionBody = BuildExpressionForProperty(newContext);
            }
        }

        return expressionBody;
    }

	public virtual Expression BuildDefaultExpression(ExpressionBuildContext context)
    {
        if (context.FilterPropertyValue is IFilter filter)
        {
            if (typeof(ICollection).IsAssignableFrom(context.TargetProperty.PropertyType)
				|| (context.TargetProperty.PropertyType.IsConstructedGenericType
					&& typeof(IEnumerable).IsAssignableFrom(context.TargetProperty.PropertyType)))
            {
                return Singleton<CollectionFilterAttribute>.Instance.BuildExpression(context);
            }
            else
            {
                var parameter = Expression.Property(context.CurrentBody, context.TargetProperty.Name);

                return filter.BuildExpression(context.TargetProperty.PropertyType, parameter);
            }
        }

        if (context.FilterPropertyValue is IFilterableType filterableProperty)
        {
            return filterableProperty.BuildExpression(context);
        }
        else if (context.FilterProperty.PropertyType.IsArray && !typeof(ICollection).IsAssignableFrom(context.TargetProperty.PropertyType))
        {
            return Singleton<ArraySearchFilterAttribute>.Instance.BuildExpression(context);
        }
        else
        {
            return OperatorComparison.Equal.BuildExpression(context);
        }
    }
}