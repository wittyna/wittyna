import 'reflect-metadata';
const logMethodMeta: MethodDecorator = (target, key) => {
  console.log(
    'method parameter type:',
    Reflect.getMetadata('design:paramtypes', target, key)
  );
  console.log(
    'method return type:',
    Reflect.getMetadata('design:returntype', target, key)
  );
};

const logClassMeta: ClassDecorator = (target) => {
  console.log(target, 123);
};

const logPropertyMeta: PropertyDecorator = (prototype, propertyKey) => {
  console.log(
    'property type:',
    Reflect.getMetadata('design:type', prototype, propertyKey)
  );
};
class A {
  a = 1;
}
class B {
  a = 1;
}
interface C {
  a: string;
  b: number;
  c: boolean;
}

@logClassMeta
class MyClass {
  @logPropertyMeta
  a?: B[];
  @logMethodMeta
  myMethod(param1: string, param2: A): B {
    return new B();
    // 方法体
  }
}
