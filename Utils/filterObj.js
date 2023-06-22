
/* 
"obj": هو الكائن الذي يتم تصفيته.
"allowedFields": قائمة الحقول المسموح بها التي يجب أن تبقى في الكائن المصفى.

*/


const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  };
  
  module.exports = filterObj;