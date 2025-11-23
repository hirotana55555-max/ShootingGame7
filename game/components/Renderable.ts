// game/components/Renderable.ts
export interface RenderableProps {
  color?: string;
  width?: number;
  height?: number;
  shape?: 'rectangle' | 'circle';
}

export class Renderable {
  public color: string;
  public width: number;
  public height: number;
  public shape: 'rectangle' | 'circle';

  constructor({ color = 'white', width = 10, height = 10, shape = 'rectangle' }: RenderableProps = {}) {
    this.color = color;
    this.width = width;
    this.height = height;
    this.shape = shape;
  }
}
