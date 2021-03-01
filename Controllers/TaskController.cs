using System;
using System.Collections.Generic;
using System.Linq;
using Cerulean.Data;
using Cerulean.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Type = Cerulean.Models.Type;

namespace Cerulean.Controllers
{
    [Route("[controller]")]
    public class TaskController : Controller
    {
        private readonly Context _context;
        
        public TaskController(Context context)
        {
            _context = context;
        }
        
        [HttpGet]
        public IEnumerable<Task> Get()
        {
            return _context.Task.ToList();
        }
        
        [HttpPost]
        public int Create([FromBody]Task task)
        {
            _context.Task.Add(task);
            return _context.SaveChanges();
        }
        
        [HttpPut]
        public int Update([FromBody]Task task)
        {
            task.ModifiedOn = DateTimeOffset.Now;
            _context.Task.Update(task);
            return _context.SaveChanges();
        }
        
        [HttpDelete]
        public int Delete(Guid id)
        {
            var task = _context.Task.Find(id);
            if (task == null) return 0;
            _context.Task.Remove(task);
            return _context.SaveChanges();
        }
    }
}