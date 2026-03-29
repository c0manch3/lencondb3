import type { FC } from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: FC = () => {
  return (
    <div className="min-h-dvh bg-cream-50 flex flex-col items-center justify-center px-4">
      <p className="text-[8rem] leading-none font-bold text-brown-300 select-none">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold text-brown-900">
        {'\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430'}
      </h1>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded bg-brown-900 text-cream-50 text-sm font-medium hover:bg-black transition-colors duration-200"
      >
        {'\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E'}
      </Link>
    </div>
  );
};

export default NotFoundPage;
