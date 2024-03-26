﻿using System;
using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.AutoFilterer;

namespace AutoFilterer.Attributes;

[AttributeUsage(AttributeTargets.Property, Inherited = true, AllowMultiple = false)]
public class IgnoreFilterAttribute : FilteringOptionsBaseAttribute
{
    public override Expression BuildExpression(ExpressionBuildContext context)
    {
        return context.CurrentBody;
    }
}