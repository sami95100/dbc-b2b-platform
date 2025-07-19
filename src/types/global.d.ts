// Types globaux pour l'application

import { User } from '@/rbac/types';
import { Product } from '@/domain/catalog/types';

declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createTestUser: (overrides?: Partial<User>) => User;
        createTestProduct: (overrides?: any) => Product;
        createTestOrder: (overrides?: any) => any;
      };
    }
  }

  var testUtils: {
    createTestUser: (overrides?: Partial<User>) => User;
    createTestProduct: (overrides?: any) => Product;
    createTestOrder: (overrides?: any) => any;
  };
}

export {}; 