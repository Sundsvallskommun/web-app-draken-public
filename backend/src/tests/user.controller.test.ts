import { UserController } from '@/controllers/user.controller';

import { mockReq, mockRes, mockUser } from './helpers/http';

const handlerEmail = 'linn.saltsidis@sundsvall.se';

describe('the user the frontend is told about', () => {
  it('carries the email, which the templates ask for as the handler who orders', async () => {
    const res = mockRes();

    await new UserController().getUser(mockReq(mockUser({ email: handlerEmail })), res);

    expect(res.body).toMatchObject({ data: { email: handlerEmail } });
  });

  it('refuses a session without a name rather than answering half a user', async () => {
    await expect(new UserController().getUser(mockReq(mockUser({ name: undefined })), mockRes())).rejects.toMatchObject({
      status: 400,
    });
  });
});
