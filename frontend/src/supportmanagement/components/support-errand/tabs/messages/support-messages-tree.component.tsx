import React, { Fragment, useState } from 'react';
import { RenderedSupportMessage } from './rendered-support-message.component';
import { Divider } from '@mui/material';
import { Button, cx } from '@sk-web-gui/react';
import {
  MessageNode,
  countAllMessages,
  countUnreadMessages,
} from '@supportmanagement/services/support-message-service';

interface MessageTreeProps {
  nodes: MessageNode[];
  selected: string;
  onSelect: (node: MessageNode) => void;
}

const getId = (node: MessageNode): string => {
  return node.emailHeaders['MESSAGE_ID']?.[0];
};

const MessageNodeComponent: React.FC<{
  node: MessageNode;
  selected: string;
  onSelect: (node: MessageNode) => void;
  root?: boolean;
}> = ({ node, selected, onSelect, root = false }) => {
  const [showChildren, setShowChildren] = useState(true);

  return (
    <>
      <div className="m-md mr-0" id={`node-${getId(node)}`}>
        <RenderedSupportMessage message={node} selected={selected} onSelect={onSelect} root={root}>
          {root && node.children?.length ? (
            <Button
              size="sm"
              className="text-small"
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setShowChildren(!showChildren);
              }}
            >
              {showChildren
                ? `Dölj svar`
                : `Visa svar (${countAllMessages(node.children)} varav ${countUnreadMessages(node.children)} ${
                    countUnreadMessages(node.children) === 1 ? 'oläst' : 'olästa'
                  })`}
            </Button>
          ) : null}
        </RenderedSupportMessage>
        {showChildren && node.children && node.children.length > 0 && (
          <div className={cx(root ? 'border-l' : 'border-l')}>
            {node.children.map((child, idx) => (
              <MessageNodeComponent
                key={`${idx}-${getId(child)}`}
                node={child}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const MessageTreeComponent: React.FC<MessageTreeProps> = ({ nodes, selected, onSelect }) => {
  return (
    <div className="my-lg">
      {nodes.map((node, idx) => (
        <Fragment key={`${idx}-${getId(node)}`}>
          <Divider />
          <MessageNodeComponent node={node} selected={selected} onSelect={onSelect} root={true} />
        </Fragment>
      ))}
    </div>
  );
};

export default MessageTreeComponent;
